const { Client } = require('pg')

module.exports = {
  query: async(text, params) => {
    try {
        const client = new Client({
          user: 'pk_user',
          host: 'database-1.citzyxbyrxh6.eu-north-1.rds.amazonaws.com',
          database: 'stock',
          password: '1c$4CM9p9b@Z',
          port: 5432,
        });
    
        client.connect((err) => {
          if (err) {
            console.error('connection error', err.stack)
          }
        }) 

        try {
          return await client.query(text, params)
        } catch(error) {
          
        }
        client.end()
        return null;

    } catch (error) {
        console.log(error)
    }
  }
}
