create database sweethome;
use sweethome;

create table users(
usid        int primary key,
firstname   varchar(100),
secondname  varchar(100),
email       varchar(170),
passwords   varchar(250),
);