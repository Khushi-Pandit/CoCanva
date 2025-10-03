import mongoose, {Document, Schema, Model}  from "mongoose";

export interface IUser extends Document {
    fullname: string;
    email: string;
    password: string;
}

const UserSchema: Schema<IUser> = new Schema ({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    fullname: {
        type: String,
        required: false,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    }
}, {
    timestamps: true
});

export default mongoose.model<IUser>("User", UserSchema);