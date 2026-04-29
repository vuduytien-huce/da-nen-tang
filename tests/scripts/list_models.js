const fetch = require('node-fetch');

async function listModels() {
  const key = 'AIzaSyBoZPrdB8ebwV9kFIMdyGM6IZ9xOo5jgZM';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

listModels();
