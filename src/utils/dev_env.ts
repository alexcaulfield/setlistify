export const fetchUrl = (): string => {
  return process.env.REACT_APP_ENV === 'dev' ? '' : 'https://aahxozyk09.execute-api.us-east-1.amazonaws.com/dev';
};
