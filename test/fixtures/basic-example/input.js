import Template from './template.html?caveman';

document.body.innerHTML = Template.render({ message: 'Hello World!' });
