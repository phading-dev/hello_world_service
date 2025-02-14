import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface User {
  userId?: string,
  createdTimeMs?: number,
}

export let USER: MessageDescriptor<User> = {
  name: 'User',
  fields: [{
    name: 'userId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'createdTimeMs',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};
