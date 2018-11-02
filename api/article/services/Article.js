'use strict';

/**
 * Article.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require('lodash');

// implement MongoDB $nin filter
function notInFilter(filters) {
  if (filters.where.source) {
    if (filters.where.source['$ne'] && filters.where.source['$ne'].length > 1) {
      filters.where.source = { '$nin': filters.where.source['$ne'] };
    }
  }
  return filters;
}

const getIds = (arr) => arr.map(entry => entry._id);

module.exports = {

  /**
   * Promise to fetch an user feed
   *
   * @return {Promise}
   */
  feed: async (params) => {
    try {
      // Convert `params` object to filters compatible with Mongo.
      const filters = strapi.utils.models.convertParams('article', params);

      // get the user
      const appuser = await strapi.services.appuser
        .fetch({_id: params.appuser});

      // get followed tags and organisations
      const tags = getIds(appuser.tags);
      const organisations = getIds(appuser.organisations);
      const followedOrganisations = await strapi.services.organisation
        .fetchAll({_id: {$in: organisations}});

      // get sources from followed organisations
      const sources = followedOrganisations
        .map(organisation => organisation.sources)
        .reduce((acc, val) => acc.concat(val), []); // flatten

      // set filter for tags and sources
      const $or = [
        {tags: {$in: tags}},
        {source: {$in: sources}},
        {isHot: true}
      ];

      // handle location radius
      if (appuser.data.location) {
        const geoQuery = {'geodata.location': {$geoWithin: {$center: [appuser.data.location, appuser.radius]}}};
        $or.push(geoQuery);
        $or.push({organisation: geoQuery});
      }

      return Article
        .find({isVisible: true})
        .populate({
          path: 'source',
          populate: {path: 'organisation'}
        })
        .where({$or})
        .sort(filters.sort)
        .skip(filters.start)
        .limit(filters.limit);
    } catch (err) {
      return;
    }
  },

  /**
   * Promise to fetch all articles.
   *
   * @return {Promise}
   */

  fetchAll: (params) => {
    // Convert `params` object to filters compatible with Mongo.
    let filters = strapi.utils.models.convertParams('article', params);
    filters = notInFilter(filters);

    // Select field to populate.
    const populate = Article.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    return Article
      .find()
      .where(filters.where)
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  },

  /**
   * Promise to fetch a/an article.
   *
   * @return {Promise}
   */

  fetch: (params) => {
    // Select field to populate.
    const populate = Article.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    return Article
      .findOne(_.pick(params, _.keys(Article.schema.paths)))
      .populate(populate);
  },

  /**
   * Promise to count articles.
   *
   * @return {Promise}
   */

  count: (params) => {
    // Convert `params` object to filters compatible with Mongo.
    let filters = strapi.utils.models.convertParams('article', params);
    filters = notInFilter(filters);

    // convert search query to $or filter
    if (filters.where._q) filters.where = {
      $or: [
        { title: { $regex: filters.where._q, $options: 'i'}},
        { content: { $regex: filters.where._q, $options: 'i'}}
      ]
    };

    return Article
      .count()
      .where(filters.where);
  },

  /**
   * Promise to add a/an article.
   *
   * @return {Promise}
   */

  add: async (values) => {
    if (typeof values === 'string') values = JSON.parse(values);

    // Extract values related to relational data.
    const relations = _.pick(values, Article.associations.map(ast => ast.alias));
    const data = _.omit(values, Article.associations.map(ast => ast.alias));

    // Create entry with no-relational data.
    const entry = await Article.create(data);

    // Create relational data and return the entry.
    return Article.updateRelations({ _id: entry.id, values: relations });
  },

  /**
   * Promise to edit a/an article.
   *
   * @return {Promise}
   */

  edit: async (params, values) => {
    if (typeof values === 'string') values = JSON.parse(values);

    // Extract values related to relational data.
    const relations = _.pick(values, Article.associations.map(a => a.alias));
    const data = _.omit(values, Article.associations.map(a => a.alias));

    // Update entry with no-relational data.
    const entry = await Article.update(params, data, { multi: true });

    // Update relational data and return the entry.
    return Article.updateRelations(Object.assign(params, { values: relations }));
  },

  /**
   * Promise to remove a/an article.
   *
   * @return {Promise}
   */

  remove: async params => {
    // Select field to populate.
    const populate = Article.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    // Note: To get the full response of Mongo, use the `remove()` method
    // or add spent the parameter `{ passRawResult: true }` as second argument.
    const data = await Article
      .findOneAndRemove(params, {})
      .populate(populate);

    if (!data) {
      return data;
    }

    await Promise.all(
      Article.associations.map(async association => {
        const search = _.endsWith(association.nature, 'One') || association.nature === 'oneToMany' ? { [association.via]: data._id } : { [association.via]: { $in: [data._id] } };
        const update = _.endsWith(association.nature, 'One') || association.nature === 'oneToMany' ? { [association.via]: null } : { $pull: { [association.via]: data._id } };

        // Retrieve model.
        const model = association.plugin ?
          strapi.plugins[association.plugin].models[association.model || association.collection] :
          strapi.models[association.model || association.collection];

        return model.update(search, update, { multi: true });
      })
    );

    return data;
  },

  /**
   * Promise to search a/an article.
   *
   * @return {Promise}
   */

  search: async (params) => {
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams('article', params);
    // Select field to populate.
    const populate = Article.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    const $or = Object.keys(Article.attributes).reduce((acc, curr) => {
      switch (Article.attributes[curr].type) {
        case 'integer':
        case 'float':
        case 'decimal':
          if (!_.isNaN(_.toNumber(params._q))) {
            return acc.concat({ [curr]: params._q });
          }

          return acc;
        case 'string':
        case 'text':
        case 'password':
          return acc.concat({ [curr]: { $regex: params._q, $options: 'i' } });
        case 'boolean':
          if (params._q === 'true' || params._q === 'false') {
            return acc.concat({ [curr]: params._q === 'true' });
          }

          return acc;
        default:
          return acc;
      }
    }, []);

    delete filters.where._q; // already converted in $or

    return Article
      .find({ $or })
      .where(filters.where)
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  }
};
