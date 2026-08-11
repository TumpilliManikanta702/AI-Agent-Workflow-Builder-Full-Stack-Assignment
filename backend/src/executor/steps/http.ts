export async function executeHttpStep(config: any, inputData: any) {
  const url = config.url || 'https://jsonplaceholder.typicode.com/todos/1';
  const method = (config.method || 'GET').toUpperCase();
  const headers = config.headers || {};
  const bodyData = config.body || {};

  const reqOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    reqOptions.body = JSON.stringify({ ...bodyData, input: inputData });
  }

  const response = await fetch(url, reqOptions);
  const contentType = response.headers.get('content-type') || '';

  let responseData: any;
  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    throw new Error(`HTTP Request failed with status ${response.status}: ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
  }

  return {
    url,
    method,
    status: response.status,
    response: responseData,
  };
}
