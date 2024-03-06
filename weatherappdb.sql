-- CREATE TABLE users
-- (id BIGSERIAL PRIMARY KEY NOT NULL,
-- name varchar(200) NOT NULL,
-- email varchar(200) NOT NULL,
-- password varchar(200) NOT NULL,
-- favorite varchar [],
-- UNIQUE(email) );

-- ALTER TABLE users
-- ADD oras_default varchar(200),
-- ADD alert bool;

-- Direct export from PostgreSQL ---------------------------------------------------
-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    name character varying(200) COLLATE pg_catalog."default" NOT NULL,
    email character varying(200) COLLATE pg_catalog."default" NOT NULL,
    password character varying(200) COLLATE pg_catalog."default" NOT NULL,
    favorite character varying[] COLLATE pg_catalog."default",
    oras_default character varying(200) COLLATE pg_catalog."default",
    alert boolean,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;

GRANT ALL ON TABLE public.users TO postgres;

GRANT ALL ON TABLE public.users TO weatherapp;