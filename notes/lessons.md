1. Benefits of superteset
   It allows you to create a request agent that can perform HTTP requests against an Express application without starting an actual server.
   Supertest allows you to chain multiple requests together. You can perform sequential requests, making it possible to test different endpoints or scenarios within your application without the need to restart or run a server for each request.
2. Jest & Babel & ECMAScript Modules
   Jest does not support ECMAScript Modules 'out of the box' and requires a code transformer such as Babel to convert ES Modules into JS code that is compatible with Jest.
   But, the other workround is having Jest to run tests via an experimental feature known as VM Modules that supports ES Modules. I chose this given it prevented me from having to install a code transformer.
3. The Pool class in postgress allows for a scaled number of DB connections compared to Client class.
4. Database adapters are commonly used in software architectures that follow principles like dependency inversion and modular design. They help decouple the application code from the specific details of the database, making the code more maintainable, testable, and adaptable to changes in the database technology. Popular databases often have dedicated libraries or ORM (Object-Relational Mapping) tools that serve as database adapters for specific programming languages and frameworks.
5. Node.js (or more specifically, database drivers for Node.js) uses sockets as a method of connection to databases because sockets provide a reliable and efficient means of communication between the Node.js application and the database server. Sockets are a fundamental concept in networking, and they enable two-way communication between processes over a network or between processes on the same machine.

While sockets are a common method of communication, it's worth noting that the term "socket" can refer to different types of communication mechanisms, including TCP sockets and Unix domain sockets. The specific type of socket used may depend on factors such as the nature of the database server and the configuration of the Node.js application.

In summary, while sockets are a prevalent method for communication in networked environments, the specific type of socket and other communication methods may depend on the database system and its supported protocols. Node.js and its database drivers are designed to leverage the most appropriate communication mechanism based on the characteristics of the database and the requirements of the application.

- Here's why sockets are commonly used for database connections in Node.js:
- Network Communication: In most scenarios, the database server is not running on the same machine as the Node.js application. Sockets provide a standard way for processes on different machines to communicate over a network.
- Bidirectional Communication: Sockets support bidirectional communication, meaning that both the Node.js application and the database server can send and receive data. This is essential for executing queries, receiving results, and handling other communication between the application and the database
- Efficiency: Sockets are efficient in terms of both performance and resource usage. They allow for low-latency communication and minimize the overhead associated with establishing and maintaining connections.
- Connection Reuse: Sockets facilitate the reuse of connections. Instead of opening a new connection for each database operation, the application can reuse an existing socket connection. This is important for performance, especially in scenarios with multiple concurrent requests.
- Supported by Database Protocols: Many database management systems use network protocols that are built on top of sockets. For example, the PostgreSQL protocol and MySQL protocol are designed to work over sockets. By using sockets, Node.js applications can seamlessly integrate with these database systems. 6.

6. Why are database drivers needed?
   Using a database driver abstracts away the intricacies of database communication, making it easier for developers to work with databases in their Node.js applications. It provides a higher-level interface that aligns with the conventions and patterns of Node.js programming, allowing developers to focus on building application logic rather than dealing with low-level details of database interaction.

7. Should I explicitly end a DB pool connection?

   "pool.end shuts down a pool completely. In your case - in a web scenario - you do not want do do this. Otherwise you would have to connect to a pool on every new request. This defeats the purpose of pooling.

   In your example without calling pool.end - you are using the pool.query method. You are all set here and do not have to use any kind of client cleanup or pool ending.

   The pool is usually a long-lived process in your application. You almost never have to shut it down yourself in a web application.

   You will have to shut it down - when your are creating pools dynamically or when you are attempting a gracefull shutdown.

   For example: in a testing environment, where you connect to a pool before all the features/tests and disconnect after the tests are run, you call pool.end at the end on all dynamically created pools."

   Source: https://stackoverflow.com/questions/68901534/when-should-i-use-pool-end
