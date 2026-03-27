import snowflake from 'snowflake-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionOptions = {
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USER,
    password: process.env.SNOWFLAKE_PASSWORD,
    role: process.env.SNOWFLAKE_ROLE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE
};

let connection;

export const connectDB = () => {
    return new Promise((resolve, reject) => {
        connection = snowflake.createConnection(connectionOptions);
        connection.connect(async (err, conn) => {
            if (err) {
                console.error('Unable to connect to Snowflake:', err.message);
                return reject(err);
            }
            console.log('Successfully connected to Snowflake.');

            try {
                
                // Ensure the database and schema exist
                const dbName = process.env.SNOWFLAKE_DATABASE;
                const schemaName = process.env.SNOWFLAKE_SCHEMA;

                await executeQuery(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
                await executeQuery(`USE DATABASE ${dbName}`);
                
                await executeQuery(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
                await executeQuery(`USE SCHEMA ${schemaName}`);

                // Read and execute schema
                const schemaPath = path.resolve(__dirname, '../schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                
                const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
                for (let stmt of statements) {
                    await executeQuery(stmt);
                }

                console.log('Database and schema verified/created successfully.');
                resolve(conn);
            } catch (e) {
                console.error('Error initializing database/schema in Snowflake:', e);
                reject(e);
            }
        });
    });
};

export const executeQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        if (!connection) {
             return reject(new Error('No Snowflake connection available.'));
        }

        let sfQuery = query;

        connection.execute({
            sqlText: sfQuery,
            binds: params,
            complete: (err, stmt, rows) => {
                if (err) {
                    console.error('Query failed:', err.message, '\nQuery:', sfQuery);
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        });
    });
};

export const closeDB = () => {
    return new Promise((resolve, reject) => {
        if (!connection) {
             return resolve();
        }
        connection.destroy((err, conn) => {
            if (err) {
                console.error('Unable to disconnect: ' + err.message);
                reject(err);
            } else {
                console.log('Disconnected from Snowflake.');
                resolve();
            }
        });
    });
};

export default connection;