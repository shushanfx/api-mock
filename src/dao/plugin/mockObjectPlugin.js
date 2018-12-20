const logger = require('log4js').getLogger('mockObjectPlugin');

function insertOrUpdate(cacheObject, entity) {
  let list = cacheObject.get('CacheObject');
  if (!list) {
    cacheObject.set('CacheObject', []);
  }
  let found = find(cacheObject, entity);
  if (found) {
    list[found.index] = entity;
    logger.info('Append mock object of %s', entity._id);
  } else {
    list.append(entity);
    logger.info('Update mock object of %s', entity._id);
  }
}

function removeCache(cacheObject, entity) {
  let found = find(cacheObject, entity);
  if (found) {
    let list = cacheObject.get("CacheObject");
    list.splice(found.index, 1);
    logger.info('Remove mock object of %s', entity._id);
  }
  return found;
}

function find(cacheObject, entity) {
  if (entity && entity._id) {
    let list = cacheObject.get("CacheObject");
    if (list && list.length) {
      for (let i = 0; i < list.length; i++) {
        let item = list[i];
        if (item && item._id === entity._id) {
          return {
            index: i,
            entity: item
          }
        }
      }
    }
  }
}

module.exports = {
  init(mock, cache) {
    this.mock = mock;
    this.cache = cache;
    mock.post("save", (doc) => {
      insertOrUpdate(cache, doc);
    });
    mock.post("remove", (doc) => {
      removeCache(cache, doc);
    });
    logger.info('Register plugin for mock');
  }
}