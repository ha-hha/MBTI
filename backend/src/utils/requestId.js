function createRequestId() {
  return `req_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

module.exports = {
  createRequestId,
};
