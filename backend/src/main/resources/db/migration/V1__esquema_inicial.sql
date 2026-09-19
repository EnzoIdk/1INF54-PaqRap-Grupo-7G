-- Esquema inicial del dominio PaqRap (STD seccion 3).
-- Convencion: snake_case, claves primarias bigint por identidad,
-- restricciones prefijadas por tipo (pk_, fk_, uq_, ck_).

CREATE TABLE almacen (
    almacen_id      bigint GENERATED ALWAYS AS IDENTITY,
    tipo_almacen    varchar(20)     NOT NULL,
    pos_x           integer         NOT NULL,
    pos_y           integer         NOT NULL,
    stock_actual    integer         NOT NULL DEFAULT 0,
    CONSTRAINT pk_almacen PRIMARY KEY (almacen_id),
    CONSTRAINT ck_almacen_tipo_almacen CHECK (tipo_almacen IN ('CENTRAL', 'INTERMEDIO')),
    CONSTRAINT ck_almacen_pos_x CHECK (pos_x BETWEEN 0 AND 70),
    CONSTRAINT ck_almacen_pos_y CHECK (pos_y BETWEEN 0 AND 50),
    CONSTRAINT ck_almacen_stock_actual CHECK (stock_actual BETWEEN 0 AND 1000)
);

CREATE TABLE unidad_transporte (
    unidad_transporte_id    bigint GENERATED ALWAYS AS IDENTITY,
    codigo                  varchar(4)      NOT NULL,
    tipo_unidad             varchar(20)     NOT NULL,
    estado                  varchar(20)     NOT NULL DEFAULT 'DISPONIBLE',
    CONSTRAINT pk_unidad_transporte PRIMARY KEY (unidad_transporte_id),
    CONSTRAINT uq_unidad_transporte_codigo UNIQUE (codigo),
    CONSTRAINT ck_unidad_transporte_tipo_unidad CHECK (tipo_unidad IN ('AUTO', 'MOTO', 'BICICLETA'))
);

CREATE TABLE pedido (
    pedido_id           bigint GENERATED ALWAYS AS IDENTITY,
    cliente_id          varchar(10)     NOT NULL,
    pos_x               integer         NOT NULL,
    pos_y               integer         NOT NULL,
    cantidad_producto   integer         NOT NULL,
    plazo_horas         integer         NOT NULL,
    minuto_simulacion   integer         NOT NULL,
    estado              varchar(20)     NOT NULL DEFAULT 'PENDIENTE',
    registrado_en       timestamp       NOT NULL DEFAULT now(),
    CONSTRAINT pk_pedido PRIMARY KEY (pedido_id),
    CONSTRAINT ck_pedido_pos_x CHECK (pos_x BETWEEN 0 AND 70),
    CONSTRAINT ck_pedido_pos_y CHECK (pos_y BETWEEN 0 AND 50),
    CONSTRAINT ck_pedido_cantidad_producto CHECK (cantidad_producto > 0),
    CONSTRAINT ck_pedido_plazo_horas CHECK (plazo_horas IN (4, 8, 12, 18, 36))
);

CREATE INDEX idx_pedido_registrado_en ON pedido (minuto_simulacion);
CREATE INDEX idx_pedido_estado ON pedido (estado);

CREATE TABLE bloqueo (
    bloqueo_id          bigint GENERATED ALWAYS AS IDENTITY,
    inicio_minuto       integer         NOT NULL,
    fin_minuto          integer         NOT NULL,
    CONSTRAINT pk_bloqueo PRIMARY KEY (bloqueo_id)
);

CREATE TABLE bloqueo_nodo (
    bloqueo_id  bigint  NOT NULL,
    orden       integer NOT NULL,
    pos_x       integer NOT NULL,
    pos_y       integer NOT NULL,
    CONSTRAINT pk_bloqueo_nodo PRIMARY KEY (bloqueo_id, orden),
    CONSTRAINT fk_bloqueo_nodo_bloqueo_id FOREIGN KEY (bloqueo_id)
        REFERENCES bloqueo (bloqueo_id) ON DELETE RESTRICT,
    CONSTRAINT ck_bloqueo_nodo_pos_x CHECK (pos_x BETWEEN 0 AND 70),
    CONSTRAINT ck_bloqueo_nodo_pos_y CHECK (pos_y BETWEEN 0 AND 50)
);
