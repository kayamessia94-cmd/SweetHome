create database sweethome;
use sweethome;

create table users(
usid        int primary key,
fullname    varchar(100),
pp          int identity(1,1),
email       varchar(170),
passwords   varchar(250),
);

create table houses(
hid          int primary key,
usid         int foreign key references users(usid),
adress       varchar(250),
rooms        int,
price        money,
descriptions varchar(1000)
);

create table images(
himg         int identity(1,1) primary key,
hid          int foreign key references houses(hid),
imagepath    varchar(300),
);

create table hotels(
hoid   int primary key,
himg   int foreign key references images(himg),
adress varchar(250),
roomsa int,
);

create table resto(
resid   int primary key,
himg    int foreign key references images(himg),
adress  varchar(250),
receipt varchar(1000)
);

alter table houses add himg int foreign key references images(himg);