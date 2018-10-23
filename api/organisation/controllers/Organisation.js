'use strict';

/**
 * Organisation.js controller
 *
 * @description: A set of functions called "actions" for managing `Organisation`.
 */

module.exports = {

  /**
   * Retrieve organisation records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    if (ctx.query._q) {
      return strapi.services.organisation.search(ctx.query);
    } else {
      return strapi.services.organisation.fetchAll(ctx.query);
    }
  },

  /**
   * Retrieve a organisation record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    if (!ctx.params._id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    return strapi.services.organisation.fetch(ctx.params);
  },

  /**
   * Count organisation records.
   *
   * @return {Number}
   */

  count: async (ctx) => {
    return strapi.services.organisation.count(ctx.query);
  },

  /**
   * Create a/an organisation record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    return strapi.services.organisation.add(ctx.request.body);
  },

  /**
   * Update a/an organisation record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    return strapi.services.organisation.edit(ctx.params, ctx.request.body) ;
  },

  /**
   * Destroy a/an organisation record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    return strapi.services.organisation.remove(ctx.params);
  }
};
