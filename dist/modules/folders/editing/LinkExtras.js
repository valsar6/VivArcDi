class LinkExtras {
  /**
   * What a saved link carries besides its title and address: its name and icon. Nothing stores
   * them yet (spec 027), so copying them does nothing until that spec fills this hook.
   *
   * @param _fromId The bookmark id of the original link.
   * @param _toId The bookmark id of its copy.
   */
  copy(_fromId, _toId) {
    return Promise.resolve();
  }
}
export {
  LinkExtras
};
