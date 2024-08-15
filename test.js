const fs = require('fs');
const {getAllVideoDetails} = require('./test2.js');

// Call the function with a playlist ID
const playlistId = 'PL5VLoHraVVfpy_6MviHyjCm2Q8uGdUGGh';

getAllVideoDetails(playlistId).then((details) => {
  // Convert details to a string
  const detailsString = JSON.stringify(details, null, 2);

  // Write the details to a text file
  fs.writeFile('playlistDetails.txt', detailsString, (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log('Details saved to playlistDetails.txt');
    }
  });
}).catch((error) => {
  console.error('Error:', error);
});