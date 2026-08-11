const { DataTypes, Model } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");

class User extends Model {
  async isValidPassword(password) {
    if (!this.passwordHash) {
      return false;
    }

    return bcrypt.compare(password, this.passwordHash);
  }

  toSafeJSON() {
    const data = this.toJSON();
    delete data.passwordHash;
    return data;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "full_name",
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "password_hash",
    },

    // ENUM user_role
    role: {
      type: DataTypes.ENUM(
        "user",
        "admin",
        "moderator"
      ),
      allowNull: false,
      defaultValue: "user",
    },

    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "avatar_url",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },

    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "email_verified",
    },

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    sequelize,

    modelName: "User",

    tableName: "users",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    paranoid: true,

    deletedAt: "deleted_at",

    hooks: {
      beforeCreate: async (user) => {
        if (user.passwordHash) {
          const alreadyHashed =
            user.passwordHash.startsWith("$2");

          if (!alreadyHashed) {
            user.passwordHash =
              await bcrypt.hash(
                user.passwordHash,
                10
              );
          }
        }
      },

      beforeUpdate: async (user) => {
        if (
          user.changed("passwordHash") &&
          user.passwordHash
        ) {
          const alreadyHashed =
            user.passwordHash.startsWith("$2");

          if (!alreadyHashed) {
            user.passwordHash =
              await bcrypt.hash(
                user.passwordHash,
                10
              );
          }
        }
      },
    },
  }
);

module.exports = User;