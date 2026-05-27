const requestOptions = {
  method: "GET",
  redirect: "follow"
};

fetch('https://60s.viki.moe/v2/rednote', requestOptions)
  .then((response) => response.text())
  .then((result) => {
    console.log('API Response:', result);
    try {
      const data = JSON.parse(result);
      console.log('Parsed JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Parse error:', e);
    }
  })
  .catch((error) => console.error('Error:', error));
