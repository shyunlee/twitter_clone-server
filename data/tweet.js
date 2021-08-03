import SQ from "sequelize";
import { sequelize } from "../db/database.js";
import { User } from "./auth.js";

const Sequelize = SQ.Sequelize;
const DataTypes = SQ.DataTypes;

const Tweet = sequelize.define("tweet", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    unique: true,
    autoIncrement: true,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});
Tweet.belongsTo(User);

const SELECT_JOIN = `SELECT tweets.id, tweets.text, tweets.userId, users.username, users.name, users.email, users.url FROM users INNER JOIN tweets ON users.id = tweets.userId`;
const ORDER_BY = "ORDER BY tweets.createdAt DESC";

const INCLUDE_USER = {
  attributes: [
    "id",
    "text",
    "userId",
    "createdAt",
    [Sequelize.col("user.username"), "username"],
    [Sequelize.col("user.name"), "name"],
    [Sequelize.col("user.url"), "url"],
  ],
  include: {
    model: User,
    attributes: [],
  }
}

const ORDER_DESC = {
  order:[['createdAt', 'DESC']]
}

export async function getAllTweets() {
  return Tweet.findAll({
    ...INCLUDE_USER,
    ...ORDER_DESC
  }).then((result) => {
    return result;
  });
}

export async function getByUsername(username) {
  return Tweet.findAll({
    ...INCLUDE_USER,
    ...ORDER_DESC,
    include:{
      ...INCLUDE_USER.include,
      where:{username}
    }
  }).then(result => {
    return result
  })
}

export async function create({ text, userId }) {
  return Tweet.create({ text, userId }).then(result => {
    console.log('UserID At create', userId)
    return this.getById(result.id)
  });
}

export async function getById(tweetId) {
  return Tweet.findOne({
    ...INCLUDE_USER,
    ...ORDER_DESC,
    where:{id:tweetId}
  })
}

export async function update(tweetId, text) {
  return Tweet.findByPk(tweetId, INCLUDE_USER)
    .then(result => {
      result.text = text
      return result.save()
    })
}

export async function remove(tweetId) {
  return Tweet.findByPk(tweetId)
    .then(result => {
      result.destroy()
    })
}
