exports.handler = async function(event, context) {
  console.log("Metoda:", event.httpMethod);
  console.log("Headers:", event.headers);
  console.log("Body:", event.body);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "OK",
      method: event.httpMethod,
      contentType: event.headers['content-type'],
    }),
  };
};
