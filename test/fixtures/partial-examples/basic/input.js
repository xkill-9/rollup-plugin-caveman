import EmailList from './emailList.html?caveman';

document.body.innerHTML = EmailList.render({
  emails: [
    { email: 'jimmy@gmail.com', name: 'Jimmy' },
    { email: 'ralph@gmail.com', name: 'Ralph' },
    { email: 'joe@gmail.com', name: 'Joe' },
  ],
});
