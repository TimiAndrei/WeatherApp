CREATE TABLE users
(id BIGSERIAL PRIMARY KEY NOT NULL,
name varchar(200) NOT NULL,
email varchar(200) NOT NULL,
password varchar(200) NOT NULL,
favorite varchar [],
UNIQUE(email) );

ALTER TABLE users
ADD oras_default varchar(200),
ADD alert bool;