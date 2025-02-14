import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { User, USER } from './schema';
import { serializeMessage, deserializeMessage } from '@selfage/message/serializer';
import { Database, Transaction } from '@google-cloud/spanner';
import { MessageDescriptor } from '@selfage/message/descriptor';

export function insertUserStatement(
  data: User,
): Statement {
  return insertUserInternalStatement(
    data.userId,
    data
  );
}

export function insertUserInternalStatement(
  userId: string,
  data: User,
): Statement {
  return {
    sql: "INSERT User (userId, data) VALUES (@userId, @data)",
    params: {
      userId: userId,
      data: Buffer.from(serializeMessage(data, USER).buffer),
    },
    types: {
      userId: { type: "string" },
      data: { type: "bytes" },
    }
  };
}

export interface GetUserRow {
  userData: User,
}

export let GET_USER_ROW: MessageDescriptor<GetUserRow> = {
  name: 'GetUserRow',
  fields: [{
    name: 'userData',
    index: 1,
    messageType: USER,
  }],
};

export async function getUser(
  runner: Database | Transaction,
  userUserIdEq: string,
): Promise<Array<GetUserRow>> {
  let [rows] = await runner.run({
    sql: "SELECT User.data FROM User WHERE (User.userId = @userUserIdEq)",
    params: {
      userUserIdEq: userUserIdEq,
    },
    types: {
      userUserIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetUserRow>();
  for (let row of rows) {
    resRows.push({
      userData: deserializeMessage(row.at(0).value, USER),
    });
  }
  return resRows;
}

export function updateUserStatement(
  data: User,
): Statement {
  return updateUserInternalStatement(
    data.userId,
    data
  );
}

export function updateUserInternalStatement(
  userUserIdEq: string,
  setData: User,
): Statement {
  return {
    sql: "UPDATE User SET data = @setData WHERE (User.userId = @userUserIdEq)",
    params: {
      userUserIdEq: userUserIdEq,
      setData: Buffer.from(serializeMessage(setData, USER).buffer),
    },
    types: {
      userUserIdEq: { type: "string" },
      setData: { type: "bytes" },
    }
  };
}
