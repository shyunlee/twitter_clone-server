import faker from 'faker'

export function createValidUserDetail() {
  const fakeUser = faker.helpers.userCard();
  const { name, username, email } = fakeUser;
  const password = faker.internet.password(10, true);
  const user = { name, username, email, password };

  return user;
}

export async function createNewUser(httpRequest) {
  const userDetail = createValidUserDetail();
  const userRegistered = await httpRequest.post("/auth/signup", userDetail);
  return {
    ...userDetail,
    userId: userRegistered.data.userId,
    jwt: userRegistered.data.token,
  };
}