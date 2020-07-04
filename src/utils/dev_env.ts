export const fetchUrl = (): string => {
  return process.env.API_URL ? process.env.API_URL : '';
};
