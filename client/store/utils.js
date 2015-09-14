const slugify = require('slug');

module.exports = {
    generateSlug(name, id) {
        let slugged = slugify(name.trim());
        return slugged.length <= 0 ? `deck-${id}` : slugged;
    }
};
