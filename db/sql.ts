import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export function insertUserStatement(
  args: {
    userId: string,
    createdTimeMs: number,
  }
): Statement {
  return {
    sql: "INSERT User (userId, createdTimeMs) VALUES (@userId, @createdTimeMs)",
    params: {
      userId: args.userId,
      createdTimeMs: Spanner.float(args.createdTimeMs),
    },
    types: {
      userId: { type: "string" },
      createdTimeMs: { type: "float64" },
    }
  };
}

export function deleteUserStatement(
  args: {
    userUserIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE User WHERE (User.userId = @userUserIdEq)",
    params: {
      userUserIdEq: args.userUserIdEq,
    },
    types: {
      userUserIdEq: { type: "string" },
    }
  };
}

export interface GetUserRow {
  userUserId?: string,
  userCreatedTimeMs?: number,
}

export let GET_USER_ROW: MessageDescriptor<GetUserRow> = {
  name: 'GetUserRow',
  fields: [{
    name: 'userUserId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'userCreatedTimeMs',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getUser(
  runner: Database | Transaction,
  args: {
    userUserIdEq: string,
  }
): Promise<Array<GetUserRow>> {
  let [rows] = await runner.run({
    sql: "SELECT User.userId, User.createdTimeMs FROM User WHERE (User.userId = @userUserIdEq)",
    params: {
      userUserIdEq: args.userUserIdEq,
    },
    types: {
      userUserIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetUserRow>();
  for (let row of rows) {
    resRows.push({
      userUserId: row.at(0).value == null ? undefined : row.at(0).value,
      userCreatedTimeMs: row.at(1).value == null ? undefined : row.at(1).value.value,
    });
  }
  return resRows;
}

export function updateUserStatement(
  args: {
    userUserIdEq: string,
    setCreatedTimeMs: number,
  }
): Statement {
  return {
    sql: "UPDATE User SET createdTimeMs = @setCreatedTimeMs WHERE (User.userId = @userUserIdEq)",
    params: {
      userUserIdEq: args.userUserIdEq,
      setCreatedTimeMs: Spanner.float(args.setCreatedTimeMs),
    },
    types: {
      userUserIdEq: { type: "string" },
      setCreatedTimeMs: { type: "float64" },
    }
  };
}
