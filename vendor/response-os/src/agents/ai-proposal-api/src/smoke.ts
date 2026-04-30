const baseUrl = process.env.API_BASE_URL ?? "http://localhost:8787";

const smoke = async () => {
  const response = await fetch(`${baseUrl}/v1/health`);
  const body = await response.json();
  // eslint-disable-next-line no-console
  console.log(body);
};

void smoke();
