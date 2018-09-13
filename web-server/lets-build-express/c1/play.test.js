let express = require('./express');
const app = express();

app.get('/', (req, res) => {
    console.log(req)
    console.log(res)
    res.end('hello world');
});

app.listen(3000, _ => console.log('server on 3000!'))