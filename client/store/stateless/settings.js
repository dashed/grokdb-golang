const superhot = require('store/superhot');

const transforms = {
    backupDB() {

        return new Promise(function(resolve, reject) {
            superhot
                .post(`/backup`)
                .type('json')
                .send({})
                .end(function(err, res) {

                    switch(res.status) {
                    case 204:
                    case 200:
                        resolve({});
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }

                });
        });
    }
};

module.exports = transforms;
