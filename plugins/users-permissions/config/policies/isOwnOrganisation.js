module.exports = async (ctx, next) => {
  if (ctx.state.user) {
    if (ctx.state.user.organisation) {
      const requestedOrganisation = ctx.request.url.replace('/organisations/', '');
      const organisationId = ctx.state.user.organisation._id.toString();
      if (organisationId === requestedOrganisation) return next();
    }
  }
  ctx.unauthorized('Invalid token.');
};
