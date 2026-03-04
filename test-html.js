fetch('https://www.banbokning.se/sundbyberg/index.php?ok=2&&view=day&date=20260303')
  .then(res => res.text())
  .then(html => {
    const fs = require('fs');
    fs.writeFileSync('day.html', html);
    console.log('Saved day.html');
  });
