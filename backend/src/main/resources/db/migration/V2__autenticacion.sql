CREATE TABLE usuario (
    usuario_id      bigint GENERATED ALWAYS AS IDENTITY,
    username        varchar(40)  NOT NULL,
    password_hash   varchar(100) NOT NULL,
    rol             varchar(20)  NOT NULL,
    activo          boolean      NOT NULL DEFAULT true,
    CONSTRAINT pk_usuario PRIMARY KEY (usuario_id),
    CONSTRAINT uq_usuario_username UNIQUE (username),
    CONSTRAINT ck_usuario_rol CHECK (rol IN ('ADMIN', 'USUARIO'))
);

CREATE TABLE auth_setup (
    id              integer      NOT NULL,
    completado      boolean      NOT NULL DEFAULT false,
    CONSTRAINT pk_auth_setup PRIMARY KEY (id),
    CONSTRAINT ck_auth_setup_id CHECK (id = 1)
);

INSERT INTO auth_setup (id, completado) VALUES (1, false);
