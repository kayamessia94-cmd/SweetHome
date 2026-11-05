create database sweethome;
use sweethome;

create table users(
usid        int primary key,
firstname   varchar(100),
secondname  varchar(100),
email       varchar(170),
passwords   varchar(250),
);

create table houses(
hid          int primary key,
usid         int,
adress       varchar(250),
rooms        int,
price        money,
descriptions varchar(1000)
);