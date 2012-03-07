Elvis: API samples
=======================================

These samples demonstrate various ways in which you can use the Elvis API.

All the samples are open-source and licensed under the MIT License so you can use the code in your own projects and change it as much as you need.


Demo
--------
An online demo version of these samples can be found at: [demo.elviscloud.com](http://demo.elviscloud.com)


Use and customize them yourself
--------
We encourage you to download the samples and customize them. They can provide a good starting point to build your own interfaces and apps on top of Elvis.

To use the samples on your own Elvis server, place this folder in the "<config>/plugins/active" folder of your Elvis server. They will then be available on the following url: http://<yourserver>/plugins/...name of folder...

Some of the samples auto-login using the 'guest' user. You will have to either change that, or enable the guest user in "<config>/internal-users.properties.txt" and setup appropriate permissions for that user in Elvis.


jQuery
--------
All API samples are based on the jQuery javascript library.

Old 'prototype-js' based samples are still available in the [prototype-js branch](https://github.com/dutchsoftware/elvis-API-samples/tree/prototype-js). These are not maintained anymore, so it's advised to use the jQuery variant.


API Documentation
--------
Documentation for the Elvis API is available at: [https://elvis.tenderapp.com/kb](https://elvis.tenderapp.com/kb/api)


How to contribute
--------
We encourage everyone to share and contribute improvements or new samples back to the elvis community.

If you have experience with Git and Github it is very easy to make contributions. You can [fork the project](http://help.github.com/forking), make your changes and then [send us a pull request](http://help.github.com/pull-requests) so we can incorporate your improvements.

If you [don't have experience with Git](http://help.github.com), you can just email patches or zip files to us and we will include them in the samples.


About Elvis
--------
Elvis is a digital asset management system. It's main features:

- Intuitive user interface
- Easy collaboration and sharing
- High performance search engine
- Scalable processing engine to preview images, video, office documents, Adobe CS files, PDF, XML and more.
- Powerful metadata based permission rules
- REST and SOAP API's
- Plugin framework to customize server and client functionality

For more information, go to: [www.elvisdam.com](http://www.elvisdam.com)