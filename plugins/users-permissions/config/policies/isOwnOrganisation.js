module.exports = async (ctx, next) => {
  if (ctx.state.user) {
    if (ctx.state.user.organisation) {
      console.log(ctx.request.url, ctx.state.user)
      const requestedOrganisation = ctx.request.url.replace('/organisations/', '');
      const organisationId = ctx.state.user.organisation.id;
      if (organisationId === requestedOrganisation) return next();
    }
  }
  ctx.unauthorized('Invalid token.');
};
