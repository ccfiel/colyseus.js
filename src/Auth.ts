import { get, post, put, del } from "httpie";
import { getItem, setItem, removeItem } from "./Storage";

const TOKEN_STORAGE = "colyseus-auth-token";

export enum Platform {
    ios = "ios",
    android = "android",
}

export interface Device {
    id: string,
    platform: Platform
}

export interface IStatus {
    status: boolean;
}

export interface IUser {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl: string;

    isAnonymous: boolean;
    email: string;

    lang: string;
    location: string;
    timezone: string;
    metadata: any;

    devices: Device[];

    facebookId: string;
    twitterId: string;
    googleId: string;
    gameCenterId: string;
    steamId: string;

    friendIds: string[];
    blockedUserIds: string[];

    createdAt: Date;
    updatedAt: Date;
}

export class Auth implements IUser {
    _id: string = undefined;
    username: string = undefined;
    displayName: string = undefined;
    avatarUrl: string = undefined;

    isAnonymous: boolean = undefined;
    email: string = undefined;

    lang: string = undefined;
    location: string = undefined;
    timezone: string = undefined;
    metadata: any = undefined;

    devices: Device[] = undefined;

    facebookId: string = undefined;
    twitterId: string = undefined;
    googleId: string = undefined;
    gameCenterId: string = undefined;
    steamId: string = undefined;

    friendIds: string[] = undefined;
    blockedUserIds: string[] = undefined;

    createdAt: Date = undefined;
    updatedAt: Date = undefined;

    // auth token
    token: string = undefined;

    protected endpoint: string;
    protected keepOnlineInterval: any;

    constructor(endpoint: string) {
        this.endpoint = endpoint.replace("ws", "http");
        getItem(TOKEN_STORAGE, (token) => this.token = token);
    }

    get hasToken() {
        return !!this.token;
    }

    async login (options: {
        accessToken?: string,
        deviceId?: string,
        platform?: string,
        email?: string,
        password?: string,
    } = {}) {
        const queryParams: string[] = [];
        for (const name in options) {
            queryParams.push(`${name}=${options[name]}`);
        }

        if (this.token) {
            queryParams.push(`token=${this.token}`);
        }

        const response = await post(`${this.endpoint}/auth?${queryParams.join("&")}`, {
            headers: { 'Accept': 'application/json' }
        });

        const data = response.data;

        // set & cache token
        this.token = data.token;
        setItem(TOKEN_STORAGE, this.token);

        for (let attr in data) {
            if (this.hasOwnProperty(attr)) { this[attr] = data[attr]; }
        }

        this.registerPingService();

        return this;
    }

    async save() {
        await put(`${this.endpoint}/auth`, {
            headers: { 'Accept': 'application/json' , 'Authorization': 'Bearer ' + this.token },
            body: {
                username: this.username,
                displayName: this.displayName,
                avatarUrl: this.avatarUrl,
                lang: this.lang,
                location: this.location,
                timezone: this.timezone,
            }
        });

        return this;
    }

    async getFriends() {
        return (await get(`${this.endpoint}/friends/all`, {
            headers: { 'Accept': 'application/json' , 'Authorization': 'Bearer ' + this.token }
        })).data as IUser[];
    }

    async getOnlineFriends() {
        return (await get(`${this.endpoint}/friends/online`, {
            headers: { 'Accept': 'application/json' , 'Authorization': 'Bearer ' + this.token }
        })).data as IUser[];
    }

    async getFriendRequests(friendId: string) {
        return (await get(`${this.endpoint}/friends/requests`, {
            headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + this.token }
        })).data as IUser[];
    }

    async sendFriendRequest(friendId: string) {
        return (await post(`${this.endpoint}/friends/requests?userId=${friendId}`, {
            headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + this.token }
        })).data as IStatus;
    }

    async acceptFriendRequest(friendId: string) {
        return (await put(`${this.endpoint}/friends/requests?userId=${friendId}`, {
            headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + this.token }
        })).data as IStatus;
    }

    async declineFriendRequest(friendId: string) {
        return (await del(`${this.endpoint}/friends/requests?userId=${friendId}`, {
            headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + this.token }
        })).data as IStatus;
    }

    async blockUser(friendId: string) {
        return (await post(`${this.endpoint}/friends/block?userId=${friendId}`, {
            headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + this.token }
        })).data as IStatus;
    }

    async unblockUser(friendId: string) {
        return (await put(`${this.endpoint}/friends/block?userId=${friendId}`, {
            headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + this.token }
        })).data as IStatus;
    }

    logout() {
        this.token = undefined;
        removeItem(TOKEN_STORAGE);
        this.unregisterPingService();
    }

    registerPingService(timeout: number = 15000) {
        this.unregisterPingService();

        this.keepOnlineInterval = setInterval(() => {
            get(`${this.endpoint}/auth`, {
                headers: { 'Accept': 'application/json' , 'Authorization': 'Bearer ' + this.token },
            });
        }, timeout);
    }

    unregisterPingService() {
        clearInterval(this.keepOnlineInterval);
    }

}