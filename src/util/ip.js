module.exports.getClientIP = function (ctx) {
  let ips = ctx.ips;
  if (ips && ips.length) {
    return ips[0];
  }
  let header = ctx.header['x-real-ip'];
  if (header) {
    return header;
  }
  header = ctx.header['x-forwarded-for'];
  if (header) {
    return header.split(',').pop().trim();
  }
  return 'none';
}