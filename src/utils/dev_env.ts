import process from "process";

const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

export const fetchUrl = (): string => {
  return development ? '' : 'https://aahxozyk09.execute-api.us-east-1.amazonaws.com/dev'
};
