const body = '21a167986b50a7db69d3b286f983e9ac6cef91e5';

function verificationResponse() {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'x-content-type-options': 'nosniff'
    }
  });
}

export function onRequest() {
  return verificationResponse();
}
