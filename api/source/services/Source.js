'use strict';
const HTMLParser = require('fast-html-parser');
const Parser = require('rss-parser');
const parser = new Parser({customFields: {item: ['summary', 'content', 'media:content']}});

/**
 * Source.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require('lodash');

module.exports = {

  /**
   * Promise to fetch all sources.
   *
   * @return {Promise}
   */

  fetchAll: (params) => {
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams('source', params);
    // Select field to populate.
    const populate = Source.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    return Source
      .find()
      .where(filters.where)
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  },

  /**
   * Promise to fetch a/an source.
   *
   * @return {Promise}
   */

  fetch: (params) => {
    // Select field to populate.
    const populate = Source.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    return Source
      .findOne(_.pick(params, _.keys(Source.schema.paths)))
      .populate(populate);
  },

  /**
   * Promise to count sources.
   *
   * @return {Promise}
   */

  count: (params) => {
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams('source', params);

    return Source
      .count()
      .where(filters.where);
  },

  /**
   * Promise to add a/an source.
   *
   * @return {Promise}
   */

  add: async (values) => {
    // Extract values related to relational data.
    const relations = _.pick(values, Source.associations.map(ast => ast.alias));
    const data = _.omit(values, Source.associations.map(ast => ast.alias));

    // Create entry with no-relational data.
    const entry = await Source.create(data);

    // Create relational data and return the entry.
    return Source.updateRelations({ _id: entry.id, values: relations });
  },

  /**
   * Promise to edit a/an source.
   *
   * @return {Promise}
   */

  edit: async (params, values) => {
    // Extract values related to relational data.
    const relations = _.pick(values, Source.associations.map(a => a.alias));
    const data = _.omit(values, Source.associations.map(a => a.alias));

    // Update entry with no-relational data.
    const entry = await Source.update(params, data, { multi: true });

    // Update relational data and return the entry.
    return Source.updateRelations(Object.assign(params, { values: relations }));
  },

  /**
   * Promise to remove a/an source.
   *
   * @return {Promise}
   */

  remove: async params => {
    // Select field to populate.
    const populate = Source.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    // Note: To get the full response of Mongo, use the `remove()` method
    // or add spent the parameter `{ passRawResult: true }` as second argument.
    const data = await Source
      .findOneAndRemove(params, {})
      .populate(populate);

    if (!data) {
      return data;
    }

    await Promise.all(
      Source.associations.map(async association => {
        if (!association.via || !data._id) {
          return true;
        }

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
   * Promise to search a/an source.
   *
   * @return {Promise}
   */

  search: async (params) => {
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams('source', params);
    // Select field to populate.
    const populate = Source.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    const $or = Object.keys(Source.attributes).reduce((acc, curr) => {
      switch (Source.attributes[curr].type) {
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

    return Source
      .find({ $or })
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  },

  /**
   * Fetch data from this datasource
   *
   */
  getData: async () => {
    const all = await strapi.services.source.fetchAll({});
    const sources = all.filter(source => source.type !== 'local');
    for (const source of sources) {
      const { _id, url, type, filter } = source;
      let feed;
      if (type === 'RSS')
        feed = await parser.parseURL(url);

      for (const item of feed.items) {
        const { content, summary, title, pubDate, link, guid } = item;
        const count = await strapi.services.article.count({guid});
        if (count === 0) {
          const body = `<html>${content || summary}</html>`;
          const html = HTMLParser.parse(body);

          const text = html.structuredText;
          const image = html.querySelector('img');
          let image_url;
          if (image) {
            image_url = image.attributes.src;
          } else if (item['media:content']) {
            image_url = item['media:content']['$'].url;
          }

          const article = {
            source: _id,
            date: pubDate,
            title,
            teaser: text,
            image_url,
            link,
            guid,
            published: true
          };

          try {
            if (filter) {
              const filterTerm = filter.toLowerCase();
              if (article.title.toLowerCase().includes(filterTerm) || article.teaser.toLowerCase().includes(filterTerm)) {
                addArticle(article);
              }
            } else {
              addArticle(article);
            }
          } catch (err) {
            if (err.code === 11000) await strapi.services.article.edit({link}, article);
          }
        }
      }

    }
  }
};

const addArticle = async (article) => {
  try {
    await strapi.services.article.add(article);
  } catch (err) {
    console.log(err);
  }

}
