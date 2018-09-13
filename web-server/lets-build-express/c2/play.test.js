let express = require('./express');
const app = express();

app.get('/', (req, res) => {
    res.writeHead(200);
    res.end('hello world from /');
});

app.get('/2', (req, res) => {
    res.writeHead(200);
    res.end('hello world from /2');
})

app.post('/post', (req, res) => {
    res.writeHead(200);
    res.end('Data from post :D ')
})

app.listen(3000, _ => console.log('server on 3000!'))