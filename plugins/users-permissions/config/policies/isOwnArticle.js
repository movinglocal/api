module.exports = async (ctx, next) => {
  if (ctx.state.user) {
    const { organisation } = ctx.state.user;
    if (organisation) {
      let article;
      if (Object.keys(ctx.request.body).length === 0) {
        // is empty object: {}
        const articleId = ctx.request.url.replace('/articles/', '');
        article = await strapi.services.article.fetch({_id: articleId});
      } else {
        article = ctx.request.body;
      }

      const sourceId = article.source.id || article.source;
      if (organisation.sources.find(source => source.id.toString() === sourceId)) {
        console.log('ALLOWED!!!');
        return await next();
      }
    }
  }

  ctx.unauthorized('Invalid token.');
};
