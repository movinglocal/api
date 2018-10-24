module.exports = async (ctx, next) => {
  if (ctx.state.user) {
    const requestedProfile = ctx.state.i18n.request.url.replace('/user/', '');
    const userId = ctx.state.user.id.toString();
    if (requestedProfile === userId) {
      return await next();
    }
  }
  ctx.unauthorized('Invalid token.');
};
