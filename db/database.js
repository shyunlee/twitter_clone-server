import SQ from "sequelize";
import { config } from "../config.js";

const { user, password, database, host, port } = config.db;
export const sequelize = new SQ.Sequelize(database, user, password, {
    dialect: 'mysql',
    host,
    port,
});

