const apiUrl = 'https://bajaj-bfhl-1-0ex0.onrender.com/tickets';

const data = {
  subject: "Bajaj",
  description: "crfv",
  customerEmail: "piyushmishra21052003@gmail.com",
  priority: "medium"
};

fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
.then(res => res.json().then(data => ({ status: res.status, data })))
.then(console.log)
.catch(console.error);
