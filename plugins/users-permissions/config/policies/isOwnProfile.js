module.exports = async (ctx, next) => {
  if (ctx.state.user) {
    const requestedProfile = ctx.request.url.replace('/users/', '');
    const userId = ctx.state.user.id;
    if (requestedProfile === userId) return next();
  }
  ctx.unauthorized('Invalid token.');
};
