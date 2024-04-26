res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });

- httpOnly: true prevents client-side JavaScript from accessing the cookie, protecting it from XSS attacks.
- secure: true ensures the cookie is only sent over HTTPS, protecting it from man-in-the-middle attacks.
- sameSite: 'strict' prevents the browser from sending this cookie along with cross-site requests, offering some protection against CSRF attacks.

React:

- use custom hooks/utilities for: managing authentication state, making authenticated api requests, handling token storage/retrieval.
-

---
