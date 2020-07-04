import React from 'react';
import {Link} from 'react-router-dom';
import ErrorMessage from "./error_message";

const NotFound = () => (
  <>
    <ErrorMessage
      header='Page Not Found'
      message={
        <>
          We're sorry, but this page does not exist. Please visit our {<Link to='/'>homepage</Link>}!
        </>
      }
    />
  </>
);

export default NotFound;