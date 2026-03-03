const fs = require('fs');
const html = fs.readFileSync('sample.html', 'utf-8');
const match = html.match(/name="booklength".*?<\/select>/s);
if (match) {
  console.log(match[0]);
} else {
  console.log('No selectLength found');
}
