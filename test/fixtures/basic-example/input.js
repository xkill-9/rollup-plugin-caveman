import Template from './template.html?caveman';

document.body.appendChild(Template.render({ message: 'Hello World!' }));
