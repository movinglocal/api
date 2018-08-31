'use strict';

/**
 * Source.js controller
 *
 * @description: A set of functions called "actions" for managing `Source`.
 */

module.exports = {

  /**
   * Retrieve source records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    if (ctx.query._q) {
      return strapi.services.source.search(ctx.query);
    } else {
      return strapi.services.source.fetchAll(ctx.query);
    }
  },

  /**
   * Retrieve a source record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    if (!ctx.params._id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    return strapi.services.source.fetch(ctx.params);
  },

  /**
   * Count source records.
   *
   * @return {Number}
   */

  count: async (ctx) => {
    return strapi.services.source.count(ctx.query);
  },

  /**
   * Create a/an source record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    return strapi.services.source.add(ctx.request.body);
  },

  /**
   * Update a/an source record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    return strapi.services.source.edit(ctx.params, ctx.request.body) ;
  },

  /**
   * Destroy a/an source record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    return strapi.services.source.remove(ctx.params);
  }
};
